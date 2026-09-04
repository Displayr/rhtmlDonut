# usage Example

Record snapshot logs from Branch A

    npx rhtml testVisual_s -t some_test_subset 2>&1 | tee -a theSrc/utils/executionTimeComparison/logs/some_test_subset_A.log
    
Record snapshot logs from Branch B    

    npx rhtml testVisual_s -t some_test_subset 2>&1 | tee -a theSrc/utils/executionTimeComparison/logs/some_test_subset_B.log
    
Process log files

    # node theSrc/utils/executionTimeComparison//bin/log_parser_jest.js 

    # this generates files in the stats folder
    
Compare the two stats files
    
    # node theSrc/utils/executionTimeComparison/bin/compare_two_test_runs.js 
